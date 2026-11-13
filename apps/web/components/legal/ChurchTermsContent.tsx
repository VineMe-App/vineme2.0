import Link from "next/link";
import {
  LegalH2,
  LegalH3,
  LegalLi,
  LegalP,
  LegalUl,
} from "@/components/legal/LegalPageLayout";

export default function ChurchTermsContent() {
  return (
    <>
      <LegalH2>Agreement Details</LegalH2>
      <LegalP>
        This Church Pilot Agreement (&ldquo;Agreement&rdquo;) is entered into
        between:
      </LegalP>
      <LegalP>
        VineMe International Limited, a company registered in England and Wales
        (company number: 15753981), whose registered address is 85 Great
        Portland Street, First Floor, London, W1W 7LT (&ldquo;VineMe&rdquo;); and
      </LegalP>
      <LegalP>
        The church or organisation named below (&ldquo;the Church&rdquo;):
      </LegalP>
      <div className="rounded-lg border border-brand-dark/15 bg-brand-dark/[0.03] p-5 text-sm leading-7">
        <p>Church / Organisation name:</p>
        <p className="mt-3">Registered address:</p>
        <p className="mt-3">Primary contact name:</p>
        <p className="mt-3">Primary contact email:</p>
        <p className="mt-3">Primary contact phone:</p>
      </div>
      <LegalP>
        By signing this Agreement, both parties agree to be bound by its terms.
        This Agreement shall take effect from the date on which it is signed by
        both parties.
      </LegalP>

      <LegalH2>1. Definitions</LegalH2>
      <LegalP>
        In this Agreement, the following terms have the meanings set out below:
      </LegalP>
      <LegalUl>
        <LegalLi>
          &ldquo;The Service&rdquo; means the VineMe app and all associated
          features made available to the Church and its congregation members during
          the Pilot Period.
        </LegalLi>
        <LegalLi>
          &ldquo;The Pilot Period&rdquo; means the agreed duration of the pilot
          arrangement as set out in Section 3 of this Agreement.
        </LegalLi>
        <LegalLi>
          &ldquo;Congregation Members&rdquo; or &ldquo;Users&rdquo; means
          individual members of the Church&apos;s congregation who register for and
          use the App.
        </LegalLi>
        <LegalLi>
          &ldquo;Personal Data&rdquo; has the meaning given to it under UK GDPR.
        </LegalLi>
        <LegalLi>
          &ldquo;Data Protection Law&rdquo; means the UK General Data Protection
          Regulation (UK GDPR) and the Data Protection Act 2018, as amended from
          time to time.
        </LegalLi>
        <LegalLi>
          &ldquo;Data Controller&rdquo; and &ldquo;Data Processor&rdquo; have the
          meanings given to them under Data Protection Law.
        </LegalLi>
        <LegalLi>
          &ldquo;Group Leaders&rdquo; means individuals appointed by the Church to
          lead small groups within the App.
        </LegalLi>
      </LegalUl>

      <LegalH2>2. The Service</LegalH2>
      <LegalH3>2.1 What VineMe Provides</LegalH3>
      <LegalP>
        VineMe grants the Church a non-exclusive, non-transferable licence to use
        the Service during the Pilot Period for the purpose of connecting
        congregation members with small groups.
      </LegalP>
      <LegalP>
        The Service is delivered entirely through the VineMe app. There is no
        separate web-based administration dashboard at this stage. Church
        administrators and group leaders access and manage their groups through
        the app itself.
      </LegalP>
      <LegalH3>2.2 Availability</LegalH3>
      <LegalP>
        VineMe will use reasonable endeavours to keep the Service available and
        operational throughout the Pilot Period. However, we cannot guarantee
        uninterrupted availability. Planned maintenance or unexpected technical
        issues may occasionally result in temporary unavailability. We will aim to
        provide reasonable notice of planned maintenance where possible.
      </LegalP>
      <LegalP>
        VineMe does not guarantee that the Service will meet every specific
        requirement of the Church, be entirely free from defects, or achieve any
        particular outcome.
      </LegalP>
      <LegalH3>2.3 Support</LegalH3>
      <LegalP>
        During the Pilot Period, VineMe will provide reasonable support to the
        Church&apos;s primary contact via email at{" "}
        <a
          href="mailto:connect@vineme.app"
          className="text-brand-pink underline-offset-2 hover:underline"
        >
          connect@vineme.app
        </a>
        . We aim to respond to support enquiries within 2 working days.
      </LegalP>
      <LegalP>
        Support is available for issues relating to the operation of the Service.
        VineMe is not responsible for providing support in relation to the
        Church&apos;s own devices, internet connectivity, or internal systems.
      </LegalP>
      <LegalH3>2.4 Updates and Changes to the Service</LegalH3>
      <LegalP>
        VineMe may update or modify the Service from time to time, including to
        introduce new features or to make improvements. We will aim to notify the
        Church&apos;s primary contact of any significant changes in advance.
      </LegalP>

      <LegalH2>3. Pilot Period and Fees</LegalH2>
      <LegalH3>3.1 Pilot Duration</LegalH3>
      <LegalP>
        The Pilot Period shall commence on the date this Agreement is signed and
        shall continue for an initial period of [INSERT DURATION, e.g. 6 months],
        unless terminated earlier in accordance with Section 9 of this Agreement.
      </LegalP>
      <LegalH3>3.2 Pilot Fee</LegalH3>
      <LegalP>
        In consideration for access to the Service during the Pilot Period, the
        Church agrees to pay VineMe a pilot fee of £20 (twenty pounds), payable
        within 30 days of the date of this Agreement. Payment should be made by
        bank transfer to the details provided separately by VineMe.
      </LegalP>
      <LegalP>
        This fee is non-refundable except in the event of early termination by
        VineMe without cause.
      </LegalP>
      <LegalH3>3.3 End of Pilot Period</LegalH3>
      <LegalP>
        At least 30 days before the end of the Pilot Period, VineMe and the Church
        agree to discuss in good faith whether to continue the arrangement and on
        what terms. Neither party is under any obligation to continue beyond the
        Pilot Period.
      </LegalP>
      <LegalP>
        If no new agreement is reached before the end of the Pilot Period, access
        to the Service will cease at the end of the Pilot Period and the
        Church&apos;s data will be handled in accordance with Section 7.5 of this
        Agreement.
      </LegalP>

      <LegalH2>4. The Church&apos;s Obligations</LegalH2>
      <LegalH3>4.1 Acceptable Use</LegalH3>
      <LegalP>
        The Church agrees to use the Service only for its intended purpose of
        connecting congregation members with small groups, and in accordance with
        this Agreement and VineMe&apos;s{" "}
        <Link
          href="/legal/end-user-terms"
          className="text-brand-pink underline-offset-2 hover:underline"
        >
          End User Terms and Conditions
        </Link>
        .
      </LegalP>
      <LegalP>The Church must not:</LegalP>
      <LegalUl>
        <LegalLi>
          Use the Service for any unlawful purpose or in any way that violates
          applicable laws or regulations
        </LegalLi>
        <LegalLi>
          Use the Service to send unsolicited communications of any kind to
          congregation members
        </LegalLi>
        <LegalLi>
          Attempt to copy, reverse engineer, or otherwise misuse the Service or
          its underlying technology
        </LegalLi>
        <LegalLi>
          Allow any third party outside the Church&apos;s organisation to access
          the Service without VineMe&apos;s prior written consent
        </LegalLi>
        <LegalLi>
          Use the Service for any commercial purpose beyond its intended use as a
          church community tool
        </LegalLi>
      </LegalUl>
      <LegalH3>4.2 Group Leaders and Administrators</LegalH3>
      <LegalP>
        The Church is responsible for the conduct of its group leaders and any
        individuals it grants administrative access to within the Service. The
        Church must ensure that all such individuals:
      </LegalP>
      <LegalUl>
        <LegalLi>
          Are made aware of and comply with VineMe&apos;s End User Terms and
          Conditions
        </LegalLi>
        <LegalLi>
          Handle congregation members&apos; personal data responsibly and in
          accordance with Data Protection Law
        </LegalLi>
        <LegalLi>
          Have signed a Data Handling Agreement with VineMe before being granted
          access to congregation members&apos; personal data
        </LegalLi>
      </LegalUl>
      <LegalH3>4.3 Accurate Information</LegalH3>
      <LegalP>
        The Church is responsible for ensuring that the information it provides to
        VineMe, including its primary contact details, is accurate and kept up to
        date throughout the Pilot Period.
      </LegalP>
      <LegalH3>4.4 Congregation Members</LegalH3>
      <LegalP>
        The Church acknowledges that congregation members who register for the
        Service do so under VineMe&apos;s End User Terms and Conditions and{" "}
        <Link
          href="/legal/privacy-policy"
          className="text-brand-pink underline-offset-2 hover:underline"
        >
          Privacy Notice
        </Link>
        . The Church must not misrepresent to congregation members the nature of
        the Service or how their data is used.
      </LegalP>

      <LegalH2>5. Data Protection</LegalH2>
      <LegalH3>5.1 Data Roles</LegalH3>
      <LegalP>
        The parties acknowledge that the allocation of data protection
        responsibilities between VineMe and the Church is as follows:
      </LegalP>
      <LegalUl>
        <LegalLi>
          VineMe acts as the Data Controller in respect of personal data collected
          directly from congregation members through the registration and use of
          the App.
        </LegalLi>
        <LegalLi>
          The Church acts as an independent Data Controller in respect of any
          personal data it receives about congregation members through the Service,
          including contact details shared by congregation members when joining
          groups.
        </LegalLi>
      </LegalUl>
      <LegalP>
        Each party is independently responsible for its own compliance with Data
        Protection Law in respect of the personal data it controls.
      </LegalP>
      <LegalH3>5.2 VineMe&apos;s Commitments</LegalH3>
      <LegalP>VineMe commits to:</LegalP>
      <LegalUl>
        <LegalLi>
          Collecting and processing congregation members&apos; personal data only
          for the purposes set out in its Privacy Notice
        </LegalLi>
        <LegalLi>
          Never selling, renting, or otherwise making personal data commercially
          available to any third party
        </LegalLi>
        <LegalLi>
          Implementing and maintaining appropriate technical and organisational
          security measures to protect personal data
        </LegalLi>
        <LegalLi>
          Notifying the Church without undue delay upon becoming aware of any data
          breach that may affect the Church&apos;s congregation members
        </LegalLi>
        <LegalLi>
          Deleting or anonymising all personal data relating to the Church&apos;s
          congregation members within 30 days of termination of this Agreement,
          subject to any legal obligation to retain data for a longer period
        </LegalLi>
      </LegalUl>
      <LegalH3>5.3 The Church&apos;s Commitments</LegalH3>
      <LegalP>The Church commits to:</LegalP>
      <LegalUl>
        <LegalLi>
          Handling all personal data received through the Service in accordance
          with Data Protection Law
        </LegalLi>
        <LegalLi>
          Ensuring that all group leaders and administrators who receive personal
          data through the Service have signed a Data Handling Agreement with
          VineMe
        </LegalLi>
        <LegalLi>
          Not using personal data received through the Service for any purpose
          other than managing groups and communicating with congregation members in
          connection with those groups
        </LegalLi>
        <LegalLi>
          Implementing appropriate security measures to protect personal data
          received through the Service
        </LegalLi>
        <LegalLi>
          Notifying VineMe immediately upon becoming aware of any unauthorised
          access to or misuse of personal data received through the Service
        </LegalLi>
        <LegalLi>
          Securely deleting all personal data received through the Service upon
          termination of this Agreement, or upon VineMe&apos;s written request
        </LegalLi>
      </LegalUl>
      <LegalH3>5.4 Future Integrations</LegalH3>
      <LegalP>
        VineMe may in the future integrate the Service with third-party church
        management systems, such as ChurchSuite. Where any such integration would
        result in new data sharing arrangements, VineMe will notify the Church in
        advance and update its Privacy Notice accordingly. No such integration will
        be implemented without the Church&apos;s prior agreement.
      </LegalP>

      <LegalH2>6. Intellectual Property</LegalH2>
      <LegalP>
        All intellectual property rights in the Service, including the VineMe name,
        logo, app design, and underlying technology, belong to VineMe International
        Limited. This Agreement does not transfer any intellectual property rights
        to the Church.
      </LegalP>
      <LegalP>
        The Church retains ownership of any content or data it or its congregation
        members upload to the Service. By using the Service, the Church grants
        VineMe a limited licence to use such content solely for the purpose of
        providing the Service.
      </LegalP>

      <LegalH2>7. Liability and Warranties</LegalH2>
      <LegalH3>7.1</LegalH3>
      <LegalP>Nothing in this Agreement limits or excludes either party&apos;s liability for:</LegalP>
      <LegalUl>
        <LegalLi>Death or personal injury caused by its negligence</LegalLi>
        <LegalLi>Fraud or fraudulent misrepresentation</LegalLi>
        <LegalLi>
          Any other liability that cannot lawfully be limited or excluded
        </LegalLi>
      </LegalUl>
      <LegalH3>7.2 VineMe&apos;s Liability</LegalH3>
      <LegalP>
        Subject to Section 7.1, VineMe&apos;s total liability to the Church under or
        in connection with this Agreement, whether in contract, tort (including
        negligence), breach of statutory duty or otherwise, shall not exceed the
        total fees paid by the Church to VineMe under this Agreement.
      </LegalP>
      <LegalP>
        VineMe shall not be liable for any indirect, special, or consequential
        loss, including loss of revenue, loss of data, or loss of opportunity, even
        if VineMe has been advised of the possibility of such loss.
      </LegalP>
      <LegalH3>7.3 The Church&apos;s Liability</LegalH3>
      <LegalP>
        The Church shall be liable to VineMe for any loss or damage caused by the
        Church&apos;s breach of this Agreement, including any breach of its data
        protection obligations under Section 5.
      </LegalP>
      <LegalH3>7.4 Warranties</LegalH3>
      <LegalP>
        VineMe warrants that it will provide the Service with reasonable care and
        skill. Beyond this, the Service is provided on an &ldquo;as available&rdquo;
        basis, and VineMe makes no further warranties, express or implied,
        regarding the Service&apos;s fitness for any particular purpose or
        uninterrupted availability.
      </LegalP>

      <LegalH2>8. Confidentiality</LegalH2>
      <LegalP>
        Each party agrees to keep confidential any information it receives from the
        other party that is clearly confidential or proprietary in nature, and not
        to disclose such information to any third party without the other
        party&apos;s prior written consent, except as required by law.
      </LegalP>
      <LegalP>
        This obligation of confidentiality shall survive termination of this
        Agreement.
      </LegalP>

      <LegalH2>9. Termination</LegalH2>
      <LegalH3>9.1 Termination by Either Party</LegalH3>
      <LegalP>
        Either party may terminate this Agreement at any time by giving the other
        party 30 days&apos; written notice by email.
      </LegalP>
      <LegalH3>9.2 Immediate Termination</LegalH3>
      <LegalP>Either party may terminate this Agreement immediately by written notice if the other party:</LegalP>
      <LegalUl>
        <LegalLi>
          Commits a material breach of this Agreement that is not remedied within 14
          days of written notice requiring it to do so
        </LegalLi>
        <LegalLi>
          Becomes insolvent, enters administration, or ceases to operate
        </LegalLi>
      </LegalUl>
      <LegalP>
        VineMe may also suspend or terminate the Church&apos;s access to the
        Service immediately if VineMe reasonably believes that the Church or any of
        its group leaders or administrators has misused the Service or handled
        personal data unlawfully.
      </LegalP>
      <LegalH3>9.3 Consequences of Termination</LegalH3>
      <LegalP>On termination of this Agreement for any reason:</LegalP>
      <LegalUl>
        <LegalLi>The Church&apos;s access to the Service will cease</LegalLi>
        <LegalLi>
          VineMe will delete or anonymise all personal data relating to the
          Church&apos;s congregation members within 30 days of termination, subject
          to any legal obligation to retain data for longer
        </LegalLi>
        <LegalLi>
          The Church must securely delete all personal data received through the
          Service
        </LegalLi>
        <LegalLi>
          Any provisions of this Agreement that by their nature should survive
          termination shall do so, including Sections 5, 6, 7, 8, and 10
        </LegalLi>
      </LegalUl>

      <LegalH2>10. General</LegalH2>
      <LegalH3>10.1 Entire Agreement</LegalH3>
      <LegalP>
        This Agreement, together with VineMe&apos;s End User Terms and Conditions
        and Privacy Notice, constitutes the entire agreement between the parties in
        relation to the Service and supersedes all prior discussions,
        representations, and agreements.
      </LegalP>
      <LegalH3>10.2 Amendments</LegalH3>
      <LegalP>
        VineMe may update these terms from time to time. Where changes are material,
        VineMe will provide the Church with at least 30 days&apos; written notice.
        Continued use of the Service after that notice period constitutes acceptance
        of the updated terms.
      </LegalP>
      <LegalH3>10.3 Governing Law</LegalH3>
      <LegalP>
        This Agreement is governed by the laws of England and Wales. Any disputes
        arising under or in connection with this Agreement shall be subject to the
        exclusive jurisdiction of the courts of England and Wales.
      </LegalP>
      <LegalH3>10.4 Relationship of the Parties</LegalH3>
      <LegalP>
        Nothing in this Agreement creates a partnership, joint venture, agency, or
        employment relationship between VineMe and the Church. Each party acts as an
        independent organisation.
      </LegalP>
      <LegalH3>10.5 Severability</LegalH3>
      <LegalP>
        If any provision of this Agreement is found to be unenforceable, the
        remaining provisions shall continue in full force and effect.
      </LegalP>

      <LegalH2>Signatures</LegalH2>
      <LegalP>
        By signing below, both parties confirm they have read, understood, and agreed
        to this Agreement.
      </LegalP>
      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <div className="rounded-lg border border-brand-dark/15 p-5">
          <p className="font-bold text-brand-dark">
            For and on behalf of VineMe International Limited:
          </p>
          <p className="mt-4">Signature:</p>
          <p className="mt-3">Name:</p>
          <p className="mt-3">Title:</p>
          <p className="mt-3">Date:</p>
        </div>
        <div className="rounded-lg border border-brand-dark/15 p-5">
          <p className="font-bold text-brand-dark">
            For and on behalf of the Church:
          </p>
          <p className="mt-4">Signature:</p>
          <p className="mt-3">Name:</p>
          <p className="mt-3">Title:</p>
          <p className="mt-3">Date:</p>
        </div>
      </div>
      <LegalP className="mt-8 text-sm text-brand-dark/60">
        VineMe International Limited ·{" "}
        <a
          href="mailto:connect@vineme.app"
          className="text-brand-pink underline-offset-2 hover:underline"
        >
          connect@vineme.app
        </a>
      </LegalP>
    </>
  );
}
